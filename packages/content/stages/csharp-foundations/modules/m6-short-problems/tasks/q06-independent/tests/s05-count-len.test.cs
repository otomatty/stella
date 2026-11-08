public class S05CountLenTests
{
    [Theory(DisplayName = "S05 文字数制限")]
    [InlineData("3 3\nab\nabcd\nxyz\n", "2\n")]
    [InlineData("1 3\nabcd\n", "0\n")]
    [InlineData("1 3\n\n", "1\n")]
    public void S05CountLen(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S05CountLen())));
    }
}
