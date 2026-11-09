public class S08OnceSumTests
{
    [Theory(DisplayName = "S08 1回だけ")]
    [InlineData("5\n2 2 4 7 7\n", "4\n")]
    [InlineData("3\n1 1 1\n", "0\n")]
    public void S08OnceSum(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S08OnceSum())));
    }
}
