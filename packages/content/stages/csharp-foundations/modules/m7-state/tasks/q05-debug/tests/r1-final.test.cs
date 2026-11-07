public class R1FinalTests
{
    [Fact(DisplayName = "R1 最後の値")]
    public void R1Final()
    {
        Assert.Equal(9, Answers.R1Final(10, new int[] { 3, -4 }));
        Assert.Equal(10, Answers.R1Final(10, new int[] { }));
        Assert.Equal(6, Answers.R1Final(0, new int[] { 1, 2, 3 }));
        Assert.Equal(0, Answers.R1Final(8, new int[] { -8 }));
    }
}
