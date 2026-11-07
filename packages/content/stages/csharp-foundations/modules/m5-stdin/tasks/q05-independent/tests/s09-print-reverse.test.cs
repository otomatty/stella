public class S09PrintReverseTests
{
    [Theory(DisplayName = "S09 列の逆順")]
    [InlineData("3\n7 2 9\n", "9\n2\n7\n")]
    [InlineData("1\n5\n", "5\n")]
    public void S09PrintReverse(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S09PrintReverse())));
    }
}
