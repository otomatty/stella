public class S04CountEqualTests
{
    [Theory(DisplayName = "S04 指定値との一致")]
    [InlineData("4 3\n3 1 3 5\n", "2\n")]
    [InlineData("1 3\n1\n", "0\n")]
    [InlineData("2 7\n7 7\n", "2\n")]
    public void S04CountEqual(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S04CountEqual())));
    }
}
