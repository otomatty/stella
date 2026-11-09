public class R1WinnersTests
{
    [Fact(DisplayName = "R1 上位の人数")]
    public void R1Winners()
    {
        Assert.Equal(3, Answers.R1Winners(new int[] { 90, 80, 80, 50 }, 2));
        Assert.Equal(1, Answers.R1Winners(new int[] { 10, 20, 30 }, 1));
        Assert.Equal(3, Answers.R1Winners(new int[] { 5, 5, 5 }, 2));
        Assert.Equal(2, Answers.R1Winners(new int[] { 1, 2 }, 2));
    }
}
