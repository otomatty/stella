public class S10PrintInOutTests
{
    [Theory(DisplayName = "S10 範囲に入るか")]
    [InlineData("2 5\n3\n2\n6\n5\n", "IN\nOUT\nIN\n")]
    [InlineData("2 5\n0\n", "")]
    [InlineData("2 5\n2\n2\n5\n", "IN\nIN\n")]
    public void S10PrintInOut(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S10PrintInOut())));
    }
}
