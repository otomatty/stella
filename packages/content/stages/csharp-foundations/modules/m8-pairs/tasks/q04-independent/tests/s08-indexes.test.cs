public class S08IndexesTests
{
    [Theory(DisplayName = "S08 組の番号")]
    [InlineData("4 5\n1 4 2 3\n", "0 1\n2 3\n")]
    [InlineData("2 9\n1 2\n", "none\n")]
    public void S08Indexes(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S08Indexes())));
    }
}
