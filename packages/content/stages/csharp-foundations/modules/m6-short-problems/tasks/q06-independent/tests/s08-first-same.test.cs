public class S08FirstSameTests
{
    [Theory(DisplayName = "S08 隣の一致位置")]
    [InlineData("4\n2 5 5 5\n", "1\n")]
    [InlineData("3\n1 2 3\n", "-1\n")]
    [InlineData("2\n2 2\n", "0\n")]
    public void S08FirstSame(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S08FirstSame())));
    }
}
